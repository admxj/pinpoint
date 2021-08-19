/*
 * Copyright 2021 NAVER Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.navercorp.pinpoint.profiler.context.annotation;

import com.navercorp.pinpoint.grpc.trace.PAnnotationValue;
import com.navercorp.pinpoint.profiler.context.Annotation;
import com.navercorp.pinpoint.profiler.context.grpc.GrpcAnnotationSerializable;
import com.navercorp.pinpoint.profiler.context.grpc.GrpcAnnotationValueMapper;
import com.navercorp.pinpoint.profiler.context.thrift.AnnotationValueThriftMapper;
import com.navercorp.pinpoint.profiler.context.thrift.ThriftAnnotationSerializable;
import com.navercorp.pinpoint.thrift.dto.TAnnotationValue;

/**
 * @author emeroad
 */
public class LongAnnotation implements Annotation<Long>,
        GrpcAnnotationSerializable, ThriftAnnotationSerializable {
    private final int key;
    private final long value;

    LongAnnotation(int key, long value) {
        this.key = key;
        this.value = value;
    }

    @Override
    public int getAnnotationKey() {
        return getKey();
    }

    @Override
    public int getKey() {
        return key;
    }

    @Override
    public Long getValue() {
        return value;
    }


    @Override
    public PAnnotationValue apply(GrpcAnnotationValueMapper context) {
        PAnnotationValue.Builder builder = context.getAnnotationBuilder();
        builder.setLongValue(this.value);
        return builder.build();
    }

    @Override
    public TAnnotationValue apply(AnnotationValueThriftMapper context) {
        return TAnnotationValue.longValue(this.value);
    }

    @Override
    public String toString() {
        return "LongAnnotation{" +
                key + "=" + value +
                '}';
    }
}
